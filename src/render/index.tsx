import "./styles/globals.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Routers } from "./router";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLDivElement);
root.render(
  <BrowserRouter>
    <Routers />
  </BrowserRouter>,
);
