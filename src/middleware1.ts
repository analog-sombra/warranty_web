import { NextRequest, NextResponse } from "next/server";

// Define all available roles
const ROLES = {
  SYSTEM: "SYSTEM",
  ADMIN: "ADMIN",
  MANUF_ADMIN: "MANUF_ADMIN",
  MANUF_ACCOUNTS: "MANUF_ACCOUNTS",
  MANUF_MANAGER: "MANUF_MANAGER",
  MANUF_SALES: "MANUF_SALES",
  MANUF_TECHNICAL: "MANUF_TECHNICAL",
  DEALER_ADMIN: "DEALER_ADMIN",
  DEALER_ACCOUNTS: "DEALER_ACCOUNTS",
  DEALER_MANAGER: "DEALER_MANAGER",
  DEALER_SALES: "DEALER_SALES",
  USER: "USER",
  ACCOUNTS: "ACCOUNTS",
  SALES: "SALES",
  TECHNICAL: "TECHNICAL",
} as const;

type UserRole = (typeof ROLES)[keyof typeof ROLES];

export function middleware(request: NextRequest) {
  const idCookie = request.cookies.get("id");
  const id = idCookie?.value.toString();
  const userrole = request.cookies.get("role");
  const role = userrole?.value.toString();

  const pathname = request.nextUrl.pathname;

  console.log("Middleware check:", { pathname, id: !!id, role });

  // Allow access to home page without any checks
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Define public routes that don't require authentication
  const publicRoutes = ["/login", "/adminlogin", "/adduser"];

  // Check if user is authenticated
  const isAuthenticated = !!id;

  // Helper function to check if role is valid
  const isValidRole = (role: string | undefined): role is UserRole => {
    return !!role && Object.values(ROLES).includes(role as UserRole);
  };

  // Helper function to check if a path matches any public route
  const isPublicRoute = (path: string): boolean => {
    return publicRoutes.some(route => path === route || path.startsWith(route + '/'));
  };

  // Define role-to-route mapping
  const roleRoutes: Record<UserRole, string> = {
    SYSTEM: "/admin",
    ADMIN: "/admin",
    USER: "/customer",
    ACCOUNTS: "/accounts",
    SALES: "/sales",
    TECHNICAL: "/technical",
    MANUF_ADMIN: "/company",
    MANUF_ACCOUNTS: "/company",
    MANUF_MANAGER: "/company",
    MANUF_SALES: "/company",
    MANUF_TECHNICAL: "/company",
    DEALER_ADMIN: "/dealer",
    DEALER_ACCOUNTS: "/dealer",
    DEALER_MANAGER: "/dealer",
    DEALER_SALES: "/dealer",
  };

  // 1. Handle public routes - allow access without authentication
  if (isPublicRoute(pathname)) {
    // If user is already authenticated and trying to access login pages, redirect to dashboard
    if (isAuthenticated && (pathname === "/login" || pathname === "/adminlogin")) {
      if (isValidRole(role)) {
        const userAllowedRoute = roleRoutes[role];
        return NextResponse.redirect(new URL(userAllowedRoute, request.url));
      }
    }
    return NextResponse.next();
  }

  // // 2. Handle unauthenticated users trying to access protected routes
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // // 3. Handle authenticated users with invalid roles
  if (!isValidRole(role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // // 4. Handle role-based access control for authenticated users
  const userAllowedRoute = roleRoutes[role];
  
  // // Define all protected routes
  const protectedRoutes = ["/admin", "/customer", "/accounts", "/sales", "/technical", "/company", "/dealer"];
  const isAccessingProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isAccessingProtectedRoute) {
    // Check if user is accessing their allowed route
    if (!pathname.startsWith(userAllowedRoute)) {
      return NextResponse.redirect(new URL(userAllowedRoute, request.url));
    }
  }

  return NextResponse.next();
}
