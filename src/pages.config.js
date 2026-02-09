/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Attendance from './pages/Attendance';
import Billing from './pages/Billing';
import ClassDetail from './pages/ClassDetail';
import ClassManager from './pages/ClassManager';
import FamilyRoom from './pages/FamilyRoom';
import Features from './pages/Features';
import Growth from './pages/Growth';
import Home from './pages/Home';
import Performances from './pages/Performances';
import RunBilling from './pages/RunBilling';
import Settings from './pages/Settings';
import StaffDirectory from './pages/StaffDirectory';
import Students from './pages/Students';
import Tasks from './pages/Tasks';
import TeacherDetails from './pages/TeacherDetails';
import TeacherStudio from './pages/TeacherStudio';
import TeacherTimeManagement from './pages/TeacherTimeManagement';
import Teachers from './pages/Teachers';
import Onboarding from './pages/Onboarding';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Attendance": Attendance,
    "Billing": Billing,
    "ClassDetail": ClassDetail,
    "ClassManager": ClassManager,
    "FamilyRoom": FamilyRoom,
    "Features": Features,
    "Growth": Growth,
    "Home": Home,
    "Performances": Performances,
    "RunBilling": RunBilling,
    "Settings": Settings,
    "StaffDirectory": StaffDirectory,
    "Students": Students,
    "Tasks": Tasks,
    "TeacherDetails": TeacherDetails,
    "TeacherStudio": TeacherStudio,
    "TeacherTimeManagement": TeacherTimeManagement,
    "Teachers": Teachers,
    "Onboarding": Onboarding,
}

export const pagesConfig = {
    mainPage: "Billing",
    Pages: PAGES,
    Layout: __Layout,
};