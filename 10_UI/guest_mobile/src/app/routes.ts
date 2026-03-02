import { createBrowserRouter } from "react-router";
import { LoginPage } from "./pages/login-page";
import { LoginFormPage } from "./pages/login-form-page";
import { EntryPage } from "./pages/entry-page";
import { HomePage } from "./pages/home-page";
import { StaffListPage } from "./pages/staff-list-page";
import { KudosPostPage } from "./pages/kudos-post-page";
import { KudosProcessingPage } from "./pages/kudos-processing-page";
import { KudosCompletePage } from "./pages/kudos-complete-page";
import { AccountCreatePage } from "./pages/account-create-page";
import { MyPage } from "./pages/my-page";
import { ProfileEditPage } from "./pages/profile-edit-page";
import { KudosHistoryPage } from "./pages/kudos-history-page";
import { SettingsPage } from "./pages/settings-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/entry",
    Component: EntryPage,
  },
  {
    path: "/login",
    Component: LoginFormPage,
  },
  {
    path: "/home",
    Component: HomePage,
  },
  {
    path: "/staff",
    Component: StaffListPage,
  },
  {
    path: "/kudos/processing",
    Component: KudosProcessingPage,
  },
  {
    path: "/kudos/complete",
    Component: KudosCompletePage,
  },
  {
    path: "/kudos/:staffId",
    Component: KudosPostPage,
  },
  {
    path: "/account/create",
    Component: AccountCreatePage,
  },
  {
    path: "/my-page",
    Component: MyPage,
  },
  {
    path: "/my-page/profile",
    Component: ProfileEditPage,
  },
  {
    path: "/my-page/kudos",
    Component: KudosHistoryPage,
  },
  {
    path: "/my-page/settings",
    Component: SettingsPage,
  },
]);