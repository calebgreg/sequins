import FamilyPortal from './pages/FamilyPortal';
import Home from './pages/Home';
import ClassManager from './pages/ClassManager';
import Teachers from './pages/Teachers';
import TeacherStudio from './pages/TeacherStudio';
import Students from './pages/Students';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Features from './pages/Features';
import FamilyRoom from './pages/FamilyRoom';
import Tasks from './pages/Tasks';
import Performances from './pages/Performances';
import __Layout from './Layout.jsx';


export const PAGES = {
    "FamilyPortal": FamilyPortal,
    "Home": Home,
    "ClassManager": ClassManager,
    "Teachers": Teachers,
    "TeacherStudio": TeacherStudio,
    "Students": Students,
    "Billing": Billing,
    "Settings": Settings,
    "Features": Features,
    "FamilyRoom": FamilyRoom,
    "Tasks": Tasks,
    "Performances": Performances,
}

export const pagesConfig = {
    mainPage: "FamilyPortal",
    Pages: PAGES,
    Layout: __Layout,
};