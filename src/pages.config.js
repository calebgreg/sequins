import Billing from './pages/Billing';
import ClassManager from './pages/ClassManager';
import FamilyRoom from './pages/FamilyRoom';
import Features from './pages/Features';
import Home from './pages/Home';
import Performances from './pages/Performances';
import Settings from './pages/Settings';
import Students from './pages/Students';
import Tasks from './pages/Tasks';
import Teachers from './pages/Teachers';
import TeacherStudio from './pages/TeacherStudio';
import TeacherTimeManagement from './pages/TeacherTimeManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Billing": Billing,
    "ClassManager": ClassManager,
    "FamilyRoom": FamilyRoom,
    "Features": Features,
    "Home": Home,
    "Performances": Performances,
    "Settings": Settings,
    "Students": Students,
    "Tasks": Tasks,
    "Teachers": Teachers,
    "TeacherStudio": TeacherStudio,
    "TeacherTimeManagement": TeacherTimeManagement,
}

export const pagesConfig = {
    mainPage: "Billing",
    Pages: PAGES,
    Layout: __Layout,
};