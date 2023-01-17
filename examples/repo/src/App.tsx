import React from "react";
import { createRoot } from "react-dom/client";
import { ComponentA } from "./ComponentA";
import { ComponentB } from "./ComponentB";
import { ComponentC } from "./ComponentC";

createRoot(document.getElementById("root") as HTMLElement)
  .render(
    <React.StrictMode>
      <ComponentA />
      <ComponentB />
      <ComponentC />
    </React.StrictMode>,
  );
