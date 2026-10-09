"use client";

import React, { useState, useEffect } from "react";
import "./globals.css";
import { Sidebar } from "@/components/Layout/Sidebar";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);

  useEffect(() => {
    const fetchIncidentCount = async () => {
      try {
        const res = await api.listIncidents("OPEN");
        setOpenIncidentsCount(res.open_count || 0);
      } catch {
        // quiet fallback
      }
    };
    fetchIncidentCount();
    const interval = setInterval(fetchIncidentCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <html lang="en" className="dark">
      <head>
        <title>RecoverX — System Monitoring, Backup & Disaster Recovery Platform</title>
        <meta
          name="description"
          content="Enterprise-grade local observability, automated SHA-256 backup integrity verification, and safe disaster recovery platform."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-background text-slate-100 antialiased flex">
        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          openIncidentsCount={openIncidentsCount}
        />

        {/* Main Content Area */}
        <div
          className={cn(
            "flex-1 flex flex-col min-h-screen transition-all duration-300",
            collapsed ? "ml-18" : "ml-64"
          )}
        >
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
