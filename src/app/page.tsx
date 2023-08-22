"use client";
import { NoSSR } from "next/dist/shared/lib/lazy-dynamic/dynamic-no-ssr";
import dynamic from "next/dynamic";
import React from "react";

import styles from "./page.module.css";

const DynamicComponentWithNoSSR = dynamic(
  () => import("@/app/components/DApp"),
  { ssr: false }
);

function App() {
  return (
    <div className={styles.main}>
      <NoSSR>
        <DynamicComponentWithNoSSR />
      </NoSSR>
    </div>
  );
}

export default App;
