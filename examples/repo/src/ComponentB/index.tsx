import { useState } from "react";

export const ComponentB = () => {
  const [count, setCount] = useState(0);
  setCount(1);

  return <div>ComponentB</div>;
};
