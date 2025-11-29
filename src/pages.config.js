import FamilyPortal from './pages/FamilyPortal';
import Home from './pages/Home';
import ClassManager from './pages/ClassManager';
import Teachers from './pages/Teachers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "FamilyPortal": FamilyPortal,
    "Home": Home,
    "ClassManager": ClassManager,
    "Teachers": Teachers,
}

export const pagesConfig = {
    mainPage: "FamilyPortal",
    Pages: PAGES,
    Layout: __Layout,
};