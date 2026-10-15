"use client";

// TEMPORARY verification page — deleted again right after the screenshot.
import { HelpButton, HelpPanel } from "../../components/help-guide";

export default function HelpCheck() {
  return (
    <div className="space-y-10 p-6">
      <HelpButton kind="OWNER" />
      <HelpPanel kind="OWNER" />
      <HelpPanel kind="ADMIN" />
      <HelpPanel kind="SECURITY" />
    </div>
  );
}
