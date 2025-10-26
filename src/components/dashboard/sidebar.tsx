"use client";

import {
  FluentBuildingShop16Regular,
  FluentBuildingSkyscraper24Regular,
  FluentDocumentBulletList16Regular,
  FluentMdl2ViewDashboard,
  FluentShieldAdd48Filled,
  IcBaselineAttractions,
  MaterialSymbolsLogout,
  MaterialSymbolsPersonRounded,
} from "../icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { deleteCookie } from "cookies-next/client";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (arg: boolean) => void;
  role: string;
}

const Sidebar = (props: SidebarProps) => {
  const path = usePathname();
  const router = useRouter();

  return (
    <>
      <div
        className={`w-60 h-screen top-0 left-0 fixed z-20 flex md:translate-x-0 bg-white shadow-lg border-r border-gray-200 ${
          props.isOpen ? "translate-x-0" : "-translate-x-full md:-translate-x-0"
        }`}
      >
        <div className="flex flex-col w-60 h-full">
          {/* Logo Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">WS</span>
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Warranty Smart</h2>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-2">
            <MenuTab
              name="Dashboard"
              path={path}
              pathcheck="/admin"
              click={() => props.setIsOpen(false)}
              icon={<FluentMdl2ViewDashboard className="w-5 h-5" />}
              iconColor="text-blue-600"
              gradientFrom="from-blue-500"
              gradientTo="to-blue-600"
            />
            <MenuTab
              name="Companies"
              path={path}
              pathcheck="/admin/companies"
              click={() => props.setIsOpen(false)}
              icon={<FluentShieldAdd48Filled className="w-5 h-5" />}
              iconColor="text-emerald-600"
              gradientFrom="from-emerald-500"
              gradientTo="to-emerald-600"
            />
            <MenuTab
              name="Dealers"
              path={path}
              pathcheck="/admin/dealers"
              click={() => props.setIsOpen(false)}
              icon={<FluentBuildingShop16Regular className="w-5 h-5" />}
              iconColor="text-orange-600"
              gradientFrom="from-orange-500"
              gradientTo="to-orange-600"
            />
            <MenuTab
              name="Categories"
              path={path}
              pathcheck="/admin/categories"
              click={() => props.setIsOpen(false)}
              icon={<FluentBuildingShop16Regular className="w-5 h-5" />}
              iconColor="text-purple-600"
              gradientFrom="from-purple-500"
              gradientTo="to-purple-600"
            />
            <MenuTab
              name="Subcategories"
              path={path}
              pathcheck="/admin/subcategories"
              click={() => props.setIsOpen(false)}
              icon={<FluentDocumentBulletList16Regular className="w-5 h-5" />}
              iconColor="text-violet-600"
              gradientFrom="from-violet-500"
              gradientTo="to-violet-600"
            />
            <MenuTab
              name="Products"
              path={path}
              pathcheck="/admin/products"
              click={() => props.setIsOpen(false)}
              icon={<FluentBuildingSkyscraper24Regular className="w-5 h-5" />}
              iconColor="text-teal-600"
              gradientFrom="from-teal-500"
              gradientTo="to-teal-600"
            />
            <MenuTab
              name="Claims"
              path={path}
              pathcheck="/admin/claims"
              click={() => props.setIsOpen(false)}
              icon={<MaterialSymbolsPersonRounded className="w-5 h-5" />}
              iconColor="text-pink-600"
              gradientFrom="from-pink-500"
              gradientTo="to-pink-600"
            />
            <MenuTab
              name="Users"
              path={path}
              pathcheck="/admin/users"
              click={() => props.setIsOpen(false)}
              icon={<IcBaselineAttractions className="w-5 h-5" />}
              iconColor="text-cyan-600"
              gradientFrom="from-cyan-500"
              gradientTo="to-cyan-600"
            />
            <MenuTab
              name="Reports"
              path={path}
              pathcheck="/admin/reports"
              click={() => props.setIsOpen(false)}
              icon={<FluentDocumentBulletList16Regular className="w-5 h-5" />}
              iconColor="text-indigo-600"
              gradientFrom="from-indigo-500"
              gradientTo="to-indigo-600"
            />
          </nav>

          {/* Logout Section */}
          <div className="p-2 border-t border-gray-200">
            <LogoutTab
              name="Logout"
              click={() => {
                props.setIsOpen(false);
                deleteCookie("id");
                deleteCookie("role");
                router.push("/login");
              }}
              icon={<MaterialSymbolsLogout className="w-5 h-5" />}
            />
          </div>
        </div>
      </div>
    </>
  );
};
export default Sidebar;

interface MenuTabProps {
  click: () => void;
  name: string;
  path: string;
  pathcheck: string;
  icon: React.ReactNode;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
}

const MenuTab = (props: MenuTabProps) => {
  const isActive = props.path === props.pathcheck;
  
  return (
    <Link
      onClick={props.click}
      href={props.pathcheck}
      className={`flex items-center gap-2 px-3 py-2 mx-1 my-1 rounded-lg transition-all duration-200 ${
        isActive 
          ? "bg-blue-600 text-white" 
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <span className={`${isActive ? "text-white" : props.iconColor}`}>
        {props.icon}
      </span>
      <span className={`font-medium text-sm ${isActive ? "text-white" : ""}`}>
        {props.name}
      </span>
    </Link>
  );
};

interface LogoutTabProps {
  click: () => void;
  name: string;
  icon: React.ReactNode;
}

const LogoutTab = (props: LogoutTabProps) => {
  return (
    <button
      onClick={props.click}
      className="flex items-center gap-2 px-3 py-2 mx-1 my-1 rounded-lg w-full text-red-600 hover:bg-red-50 transition-all duration-200"
    >
      <span className="text-red-600">
        {props.icon}
      </span>
      <span className="font-medium text-sm">
        {props.name}
      </span>
    </button>
  );
};
