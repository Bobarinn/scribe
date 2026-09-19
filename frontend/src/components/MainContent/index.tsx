'use client';

import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebar } from '@/components/Sidebar/SidebarProvider';

interface MainContentProps {
  children: React.ReactNode;
}

const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <main
      className={`relative flex-1 min-w-0 overflow-hidden transition-all duration-300 ${
        isCollapsed ? 'ml-20' : 'ml-64'
      }`}
    >
      {/* Global sidebar collapse toggle — lives in the top-left header region of
          every page. It floats above the page header (which is a Tauri drag
          region) and is marked no-drag so it stays clickable. */}
      <button
        onClick={toggleCollapse}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="no-drag absolute top-4 left-3 z-50 p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
      </button>

      {/* No horizontal gutter: pages render full-bleed so panels and their
          dividers reach the app edges (Cursor-style). Pages that need inset
          content apply their own max-width / padding. */}
      <div className="min-w-0 w-full max-w-full overflow-hidden">
        {children}
      </div>
    </main>
  );
};

export default MainContent;
