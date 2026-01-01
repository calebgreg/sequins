import Billing from './pages/Billing';
import ClassManager from './pages/ClassManager';
import Features from './pages/Features';
import Home from './pages/Home';
import Performances from './pages/Performances';
import Settings from './pages/Settings';
import Students from './pages/Students';
import Tasks from './pages/Tasks';
import TeacherStudio from './pages/TeacherStudio';
import Teachers from './pages/Teachers';
import FamilyRoom from './pages/FamilyRoom';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Billing": Billing,
    "ClassManager": ClassManager,
    "Features": Features,
    "Home": Home,
    "Performances": Performances,
    "Settings": Settings,
    "Students": Students,
    "Tasks": Tasks,
    "TeacherStudio": TeacherStudio,
    "Teachers": Teachers,
    "FamilyRoom": FamilyRoom,
}

export const pagesConfig = {
    mainPage: "Billing",
    Pages: PAGES,
    Layout: __Layout,
};