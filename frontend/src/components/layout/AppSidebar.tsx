import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

/**
 * Generic Sidebar component for Warehouse Admin and Staff panels.
 * Adapted from ECOMMERCE AdminSidebar for React Router.
 * Desktop-app style: light, minimal, contained — with sub-menu support.
 */
export interface SidebarSubItem {
  path: string;
  label: string;
  divider?: boolean;
  indent?: boolean;
}

export interface SidebarMenuItem {
  path?: string;
  label: string;
  icon?: React.ReactNode;
  children?: SidebarSubItem[];
  isHeader?: boolean;
}

interface AppSidebarProps {
  menuItems: SidebarMenuItem[];
  title?: string;
  subtitle?: string;
  headerIcon?: React.ReactNode;
  onLogout: () => void;
  logoutLabel?: string;
  theme?: 'emerald' | 'blue' | 'indigo';
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  menuItems,
  title,
  subtitle,
  headerIcon,
  onLogout,
  logoutLabel = 'Keluar',
  theme = 'emerald',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // Get all paths in the sidebar menu to determine the most specific active path
  const allPaths: string[] = [];
  menuItems.forEach((item) => {
    if (item.path) {
      allPaths.push(item.path);
    }
    if (item.children) {
      item.children.forEach((child) => {
        if (child.path) {
          allPaths.push(child.path);
        }
      });
    }
  });

  const isPathActive = (path: string) => {
    const isMatch = pathname === path || pathname.startsWith(path + '/');
    if (!isMatch) return false;

    // Check if there is a more specific (longer) match in our menu items
    const hasMoreSpecificMatch = allPaths.some(
      (otherPath) =>
        otherPath !== path &&
        otherPath.length > path.length &&
        (pathname === otherPath || pathname.startsWith(otherPath + '/'))
    );

    return !hasMoreSpecificMatch;
  };

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Track which group menu is expanded (Accordion style: only one at a time)
  const [expanded, setExpanded] = useState<string | null>(() => {
    // Auto-expand the group that contains the active path
    let activeGroup = null;
    menuItems.forEach((item) => {
      if (item.children?.some((c) => isPathActive(c.path))) {
        activeGroup = item.label;
      }
    });
    return activeGroup;
  });

  const accent = {
    emerald: {
      active: 'bg-white text-emerald-700 shadow-sm border border-gray-100',
      activeDot: 'bg-emerald-500',
      icon: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      iconActiveBg: 'bg-emerald-100',
      subActive: 'text-emerald-700 font-semibold',
      subDot: 'bg-emerald-500',
      hover: 'hover:bg-white hover:text-gray-800',
      logoutHover: 'hover:bg-white hover:text-red-500',
    },
    blue: {
      active: 'bg-white text-blue-700 shadow-sm border border-gray-100',
      activeDot: 'bg-blue-500',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-50',
      iconActiveBg: 'bg-blue-100',
      subActive: 'text-blue-700 font-semibold',
      subDot: 'bg-blue-500',
      hover: 'hover:bg-white hover:text-gray-800',
      logoutHover: 'hover:bg-white hover:text-red-500',
    },
    indigo: {
      active: 'bg-white text-indigo-700 shadow-sm border border-gray-100',
      activeDot: 'bg-indigo-500',
      icon: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      iconActiveBg: 'bg-indigo-100',
      subActive: 'text-indigo-700 font-semibold',
      subDot: 'bg-indigo-500',
      hover: 'hover:bg-white hover:text-gray-800',
      logoutHover: 'hover:bg-white hover:text-red-500',
    },
  }[theme];

  const toggleGroup = (label: string) => {
    setExpanded((prev) => (prev === label ? null : label));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────── */}
      {(title || subtitle || headerIcon) && (
        <div className="px-4 pt-5 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {headerIcon && (
              <div
                className={`w-9 h-9 ${accent.iconActiveBg} rounded-xl flex items-center justify-center flex-shrink-0`}
              >
                <span className={accent.icon}>{headerIcon}</span>
              </div>
            )}
            {!collapsed && (title || subtitle) && (
              <div className="min-w-0">
                {title && (
                  <h1 className="font-bold text-gray-900 text-[13px] leading-tight truncate">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-gray-400 text-[11px] truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-gray-100">
        {menuItems.map((item) => {
          if (item.isHeader) {
            if (collapsed) {
              return (
                <div key={item.label} className="my-2 border-t border-gray-200/50" />
              );
            }
            return (
              <div
                key={item.label}
                className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider select-none mt-3 first:mt-1"
              >
                {item.label}
              </div>
            );
          }

          const hasChildren = item.children && item.children.length > 0;
          const isGroupActive = hasChildren
            ? item.children!.some((c) => isPathActive(c.path))
            : isPathActive(item.path || '');

          if (hasChildren) {
            const isOpen = expanded === item.label;
            return (
              <div key={item.label} className="overflow-hidden">
                {/* Group header button */}
                <button
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      setExpanded(item.label);
                    } else {
                      toggleGroup(item.label);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                    isGroupActive
                      ? `${accent.active} font-semibold`
                      : `text-gray-500 ${accent.hover}`
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={`flex-shrink-0 transition-colors ${
                      isGroupActive
                        ? accent.icon
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">
                        {item.label}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`flex-shrink-0 transition-transform duration-300 ${
                          isOpen ? 'rotate-180' : ''
                        } ${isGroupActive ? accent.icon : 'text-gray-500'}`}
                      />
                    </>
                  )}
                </button>

                {/* Sub-items w/ Smooth Transition */}
                {!collapsed && (
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen
                        ? 'grid-rows-[1fr] opacity-100 mt-1'
                        : 'grid-rows-[0fr] opacity-0 mt-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-9 space-y-0.5 border-l border-gray-300 pl-2 py-0.5">
                        {item.children!.map((child) => {
                          // Handle divider
                          if (child.divider) {
                            return (
                              <div key={child.label} className="px-2.5 py-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  {child.label}
                                </p>
                              </div>
                            );
                          }

                          const isChildActive = isPathActive(child.path);
                          return (
                            <button
                              key={child.path}
                              onClick={() => handleNavigate(child.path)}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] transition-all duration-200 ${
                                child.indent ? 'ml-3' : ''
                              } ${
                                isChildActive
                                  ? accent.subActive
                                  : 'text-gray-400 hover:text-gray-700 hover:bg-white'
                              }`}
                            >
                              <span className="text-left truncate">{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Plain menu item (no children)
          const isActive = isPathActive(item.path || '');
          return (
            <button
              key={item.path || item.label}
              onClick={() => handleNavigate(item.path || '')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                isActive
                  ? `${accent.active} font-semibold`
                  : `text-gray-500 ${accent.hover}`
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span
                className={`flex-shrink-0 transition-colors ${
                  isActive
                    ? accent.icon
                    : 'text-gray-400 group-hover:text-gray-600'
                }`}
              >
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────── */}
      <div className="p-2 border-t border-gray-200 space-y-0.5">
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 text-xs transition-all ${accent.logoutHover}`}
        >
          <LogOut size={14} />
          {!collapsed && <span>{logoutLabel}</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white text-xs transition-all"
        >
          {collapsed ? (
            <ChevronRight size={14} className="mx-auto" />
          ) : (
            <>
              <ChevronLeft size={14} />
              <span>Kecilkan</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl shadow-md bg-white border border-gray-200 text-gray-700"
      >
        <Menu size={18} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 w-full h-full bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 h-full bg-gray-50 flex flex-col shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-full bg-gray-100 border-r-[1.5px] border-gray-300/50 sticky top-0 transition-all duration-300 ${
          collapsed ? 'w-[64px]' : 'w-[220px]'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default AppSidebar;
