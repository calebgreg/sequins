import FamilyPortal from './pages/FamilyPortal';
import Home from './pages/Home';
import ClassManager from './pages/ClassManager';
import Teachers from './pages/Teachers';
import TeacherStudio from './pages/TeacherStudio';
import Students from './pages/Students';
import Billing from './pages/Billing';
import __Layout from './Layout.jsx';


export const PAGES = {
    "FamilyPortal": FamilyPortal,
    "Home": Home,
    "ClassManager": ClassManager,
    "Teachers": Teachers,
    "TeacherStudio": TeacherStudio,
    "Students": Students,
    "Billing": Billing,
}

export const pagesConfig = {
    mainPage: "FamilyPortal",
    Pages: PAGES,
    Layout: __Layout,
};