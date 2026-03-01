import { useNavigate } from "react-router";
import { ArrowLeft, Search, Loader2, RefreshCw, UserX, User } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

interface StaffItem {
  company_member_id: string;
  display_name: string;
  job_title: string | null;
  profile_image_url: string | null;
  on_duty_started_at: string | null;
}

type LoadingState = "loading" | "success" | "error" | "expired";

export function StaffListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("all");
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [jobTitles, setJobTitles] = useState<string[]>([]);

  const fetchStaffList = async () => {
    setLoadingState("loading");
    setErrorMessage("");

    const token = localStorage.getItem("guest_session_token");
    if (!token) {
      setLoadingState("expired");
      setErrorMessage("Session not found. Please re-scan your card.");
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-14a1e5b0/public-staff-list?limit=200`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-Guest-Session-Token": token,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Staff list API error:", data);
        if (data.error_code === "GUEST_SESSION_EXPIRED" || data.error_code === "GUEST_SESSION_REVOKED") {
          setLoadingState("expired");
          setErrorMessage("Your session has expired. Please re-scan your card.");
        } else if (data.error_code === "UNAUTHORIZED") {
          setLoadingState("expired");
          setErrorMessage("Invalid session. Please re-scan your card.");
        } else {
          setLoadingState("error");
          setErrorMessage(data.message || "Failed to load staff list.");
        }
        return;
      }

      const items: StaffItem[] = data.items ?? [];
      setStaffList(items);

      // Extract unique job titles for filter
      const titles = [...new Set(items.map((s) => s.job_title).filter(Boolean))] as string[];
      setJobTitles(titles);

      setLoadingState("success");
    } catch (err) {
      console.error("Network error fetching staff list:", err);
      setLoadingState("error");
      setErrorMessage("Network error. Please check your connection.");
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  // Filter staff by search query and job title
  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      staff.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.job_title ?? "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesJobTitle =
      selectedJobTitle === "all" || staff.job_title === selectedJobTitle;

    return matchesSearch && matchesJobTitle;
  });

  // Format duty start time
  const formatDutyTime = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Get initials for avatar placeholder
  const getInitials = (name: string) => {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-background to-secondary/10 flex flex-col"
      {...pageTransition}
    >
      {/* Header */}
      <header className="relative bg-gradient-to-br from-primary via-primary to-[#0a2240] text-primary-foreground sticky top-0 z-10 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />

        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-4 px-6 pt-5 pb-4">
            <motion.button
              onClick={() => navigate("/home")}
              className="p-2 -ml-2 hover:bg-white/10 rounded-none transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <h1 className="text-xl font-light">Select Staff</h1>
            </div>
          </div>

          {/* Search Bar */}
          {loadingState === "success" && staffList.length > 0 && (
            <>
              <div className="px-6 pb-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 z-10" />
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/95 backdrop-blur-sm text-foreground pl-11 pr-4 py-3 rounded-none border border-white/20 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50 shadow-sm transition-all font-light text-sm placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Job Title Filter */}
              {jobTitles.length > 1 && (
                <div className="px-6 pb-4">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setSelectedJobTitle("all")}
                      className={`px-4 py-2 text-xs whitespace-nowrap rounded-none transition-all font-light ${
                        selectedJobTitle === "all"
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "bg-white/10 text-white/80 hover:bg-white/20"
                      }`}
                    >
                      All
                    </button>
                    {jobTitles.map((title) => (
                      <button
                        key={title}
                        onClick={() => setSelectedJobTitle(title)}
                        className={`px-4 py-2 text-xs whitespace-nowrap rounded-none transition-all font-light ${
                          selectedJobTitle === title
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "bg-white/10 text-white/80 hover:bg-white/20"
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-5 max-w-md mx-auto w-full">
        {/* Loading State */}
        {loadingState === "loading" && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
            <p className="text-muted-foreground text-sm font-light">
              Loading staff...
            </p>
          </div>
        )}

        {/* Error State */}
        {loadingState === "error" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-destructive/10 rounded-none flex items-center justify-center mx-auto mb-4">
              <UserX className="w-7 h-7 text-destructive/60" />
            </div>
            <p className="text-muted-foreground text-sm font-light mb-2">
              {errorMessage}
            </p>
            <motion.button
              onClick={fetchStaffList}
              className="mt-4 flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-light rounded-none"
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </motion.button>
          </div>
        )}

        {/* Session Expired State */}
        {loadingState === "expired" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-accent/10 rounded-none flex items-center justify-center mx-auto mb-4">
              <UserX className="w-7 h-7 text-accent/60" />
            </div>
            <p className="text-muted-foreground text-sm font-light mb-2 text-center px-4">
              {errorMessage}
            </p>
            <motion.button
              onClick={() => navigate("/")}
              className="mt-4 flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-light rounded-none"
              whileTap={{ scale: 0.95 }}
            >
              Re-scan Card
            </motion.button>
          </div>
        )}

        {/* Success State */}
        {loadingState === "success" && (
          <>
            <p className="text-xs text-muted-foreground font-light mb-4 px-1 uppercase tracking-wider">
              {filteredStaff.length} On-Duty Staff{" "}
              {filteredStaff.length === 1 ? "Member" : "Members"}
            </p>

            {/* Staff List */}
            <div className="space-y-2">
              {filteredStaff.map((staff, index) => (
                <motion.button
                  key={staff.company_member_id}
                  onClick={() =>
                    navigate(`/kudos/${staff.company_member_id}`, {
                      state: {
                        display_name: staff.display_name,
                        job_title: staff.job_title,
                        profile_image_url: staff.profile_image_url,
                        company_member_id: staff.company_member_id,
                      },
                    })
                  }
                  className="w-full bg-white border border-border rounded-none hover:border-accent/40 hover:shadow-lg transition-all text-left group overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex gap-4 items-center p-4">
                    {/* Avatar Placeholder */}
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-none overflow-hidden bg-primary/10 ring-2 ring-accent/10 group-hover:ring-accent/30 transition-all flex items-center justify-center">
                        {staff.profile_image_url ? (
                          <img
                            src={staff.profile_image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-primary/40" />
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base text-foreground font-light mb-0.5 group-hover:text-accent transition-colors">
                        {staff.display_name}
                      </h3>
                      {staff.job_title && (
                        <p className="text-sm text-muted-foreground font-light">
                          {staff.job_title}
                        </p>
                      )}
                      {staff.on_duty_started_at && (
                        <p className="text-xs text-muted-foreground/60 font-light mt-0.5">
                          On duty since{" "}
                          {formatDutyTime(staff.on_duty_started_at)}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-1 transition-all">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Empty filtered result */}
            {filteredStaff.length === 0 && staffList.length > 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-secondary/20 rounded-none flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground text-sm font-light">
                  No staff members match your search
                </p>
                <p className="text-muted-foreground/60 text-xs font-light mt-2">
                  Try adjusting your filters
                </p>
              </div>
            )}

            {/* No staff on duty at all */}
            {staffList.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-secondary/20 rounded-none flex items-center justify-center mx-auto mb-4">
                  <UserX className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground text-sm font-light">
                  No staff currently on duty
                </p>
                <p className="text-muted-foreground/60 text-xs font-light mt-2 px-8">
                  Please contact the front desk for assistance
                </p>
                <motion.button
                  onClick={fetchStaffList}
                  className="mt-6 flex items-center gap-2 px-6 py-3 bg-white border border-border text-sm font-light rounded-none mx-auto"
                  whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </motion.button>
              </div>
            )}
          </>
        )}
      </main>
    </motion.div>
  );
}