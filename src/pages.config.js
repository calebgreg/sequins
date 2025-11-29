import FamilyPortal from './pages/FamilyPortal';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "FamilyPortal": FamilyPortal,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "FamilyPortal",
    Pages: PAGES,
    Layout: __Layout,
};