import { createBrowserRouter, redirect } from "react-router";
import RootLayout from "./layouts/RootLayout";
import LoginPage from "./pages/LoginPage";
import DevicePreviewPage from "./pages/DevicePreviewPage";
import GuardedStaffLayout from "./layouts/GuardedStaffLayout";
import GuardedManagerLayout from "./layouts/GuardedManagerLayout";
import StaysPage from "./pages/StaysPage";
import CardManagementPage from "./pages/CardManagementPage";
import CardMasterPage from "./pages/CardMasterPage";
import RoomMasterPage from "./pages/RoomMasterPage";
import AffiliationManagementPage from "./pages/AffiliationManagementPage";
import CompanyInfoPage from "./pages/CompanyInfoPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ScoutPage from "./pages/ScoutPage";
import PointsGiftsPage from "./pages/PointsGiftsPage";

export const router = createBrowserRouter([
  {
    path: "/preview",
    Component: DevicePreviewPage,
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: LoginPage,
      },
      {
        path: "staff",
        Component: GuardedStaffLayout,
        children: [
          { index: true, Component: StaysPage },
          { path: "stays", Component: StaysPage },
          { path: "cards", Component: CardManagementPage },
          { path: "rooms", Component: RoomMasterPage },
          { path: "card-master", Component: CardMasterPage },
        ],
      },
      {
        path: "manager",
        Component: GuardedManagerLayout,
        children: [
          { index: true, Component: StaysPage },
          { path: "stays", Component: StaysPage },
          { path: "card-master", Component: CardMasterPage },
          { path: "card-loss", loader: () => redirect("/manager/card-master") },
          { path: "rooms", Component: RoomMasterPage },
          { path: "affiliation", Component: AffiliationManagementPage },
          { path: "company", Component: CompanyInfoPage },
          { path: "analytics", Component: AnalyticsPage },
          { path: "scout", Component: ScoutPage },
          { path: "points-gifts", Component: PointsGiftsPage },
        ],
      },
    ],
  },
]);