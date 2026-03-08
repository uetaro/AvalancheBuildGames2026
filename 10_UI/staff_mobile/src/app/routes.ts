import { createBrowserRouter } from "react-router";
import LoginPage from "./pages/LoginPage";
import MainLayout from "./pages/MainLayout";
import KudosList from "./pages/kudos/KudosList";
import KudosDashboard from "./pages/kudos/KudosDashboard";
import KudosDetail from "./pages/kudos/KudosDetail";
import WorkingStatus from "./pages/work/WorkingStatus";
import WorkActivity from "./pages/work/WorkActivity";
import PointBalance from "./pages/point/PointBalance";
import PointHistory from "./pages/point/PointHistory";
import ExchangeList from "./pages/point/ExchangeList";
import Exchange from "./pages/point/Exchange";
import EditProfile from "./pages/account/EditProfile";
import ProfileEditForm from "./pages/account/ProfileEditForm";
import PublicationRangeSetting from "./pages/account/PublicationRangeSetting";
import SharedURL from "./pages/account/SharedURL";
import AffiliationApplication from "./pages/account/AffiliationApplication";

const base = import.meta.env.BASE_URL.replace(/\/+$/, '') || undefined;

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/app",
    Component: MainLayout,
    children: [
      { index: true, Component: WorkingStatus },
      { path: "kudos", Component: KudosDashboard },
      { path: "kudos/list", Component: KudosList },
      { path: "kudos/:id", Component: KudosDetail },
      { path: "work", Component: WorkingStatus },
      { path: "work/activity", Component: WorkActivity },
      { path: "point", Component: PointBalance },
      { path: "point/history", Component: PointHistory },
      { path: "point/exchange-list", Component: ExchangeList },
      { path: "point/exchange", Component: Exchange },
      { path: "account", Component: EditProfile },
      { path: "account/profile", Component: EditProfile },
      { path: "account/profile/edit", Component: ProfileEditForm },
      { path: "account/publication", Component: PublicationRangeSetting },
      { path: "account/shared-url", Component: SharedURL },
      { path: "account/affiliation", Component: AffiliationApplication },
    ],
  },
], { basename: base });