import "./styles/globals.css";
import ReactDOM from "react-dom/client";
import {Layout} from "./layout";

const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLDivElement,
);
root.render(<Layout/>);
