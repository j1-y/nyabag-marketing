"use client";

import { FeatureSwitch } from "./FeatureSwitch";

export function DashboardNav() {
  return (
    <header className="dashboard-nav">
      <div className="dashboard-nav-spacer" aria-hidden="true" />
      <FeatureSwitch />
      <div className="dashboard-nav-spacer" aria-hidden="true" />
    </header>
  );
}
