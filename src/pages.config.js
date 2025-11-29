import FamilyPortal from './pages/FamilyPortal';
import Home from './pages/Home';
import ClassManager from './pages/ClassManager';
import __Layout from './Layout.jsx';


export const PAGES = {
    "FamilyPortal": FamilyPortal,
    "Home": Home,
    "ClassManager": ClassManager,
}

export const pagesConfig = {
    mainPage: "FamilyPortal",
    Pages: PAGES,
    Layout: __Layout,
};