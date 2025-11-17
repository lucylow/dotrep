import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Shield,
  Book,
  TrendingUp,
  Github,
  SearchCheck,
  BadgeCheck,
  Activity,
  Home,
} from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";

const menuGroups = [
  {
    title: "Public",
    items: [
      { icon: Home, label: "Home", path: "/" },
      { icon: Book, label: "Docs", path: "/docs" },
    ],
  },
  {
    title: "User & Reputation",
    items: [
      { icon: TrendingUp, label: "Reputation", path: "/reputation" },
      { icon: Github, label: "Connect GitHub", path: "/connect" },
    ],
  },
  {
    title: "Developer",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: SearchCheck, label: "Proof Explorer", path: "/proof-explorer" },
      { icon: BadgeCheck, label: "SBT Mint", path: "/sbt-mint" },
      { icon: Activity, label: "Telemetry", path: "/telemetry" },
    ],
  },
];

export function UnifiedSidebar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon" className="border-r border-gray-200/60">
          <SidebarHeader className="h-16 justify-center border-b border-gray-200/60">
            <div className="flex items-center gap-3 pl-2 group-data-[collapsible=icon]:px-0 transition-all w-full">
              <div className="flex items-center gap-3 min-w-0">
                <Shield className="w-6 h-6 text-[#6C3CF0] shrink-0" />
                <span className="font-extrabold text-[#131313] tracking-tight truncate group-data-[collapsible=icon]:hidden">
                  DotRep
                </span>
              </div>
              <button
                onClick={() => {}}
                className="ml-auto h-8 w-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A074FF] shrink-0 group-data-[collapsible=icon]:hidden"
              >
                <PanelLeft className="h-4 w-4 text-[#4F4F4F]" />
              </button>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {menuGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="px-2 py-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-[#4F4F4F] uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                  {group.title}
                </div>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={`h-11 transition-smooth font-medium rounded-lg ${
                            isActive
                              ? "bg-gradient-to-r from-[#6C3CF0]/10 to-[#A074FF]/10 text-[#6C3CF0] border-l-4 border-[#6C3CF0] shadow-sm"
                              : "text-[#131313] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#6C3CF0] dark:hover:text-[#A074FF]"
                          }`}
                        >
                          <Link href={item.path}>
                            <a className="flex items-center gap-3 w-full">
                              <item.icon
                                className={`h-5 w-5 ${
                                  isActive ? "text-[#6C3CF0]" : "text-[#4F4F4F]"
                                }`}
                              />
                              <span>{item.label}</span>
                            </a>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-gray-200/60">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-gray-100 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A074FF]">
                  <Avatar className="h-9 w-9 border border-gray-200 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-[#6C3CF0]/10 text-[#6C3CF0]">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-[#131313]">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-[#4F4F4F] truncate mt-1.5">
                      {user?.email || "user@example.com"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-[#FF5C5C] focus:text-[#FF5C5C]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          {isMobile && (
            <div className="flex border-b border-gray-200/60 h-14 items-center justify-between bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-white border border-gray-200" />
            </div>
          )}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}


