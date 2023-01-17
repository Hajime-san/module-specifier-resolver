import type { User } from "../types/User";

export const ComponentA = () => {
  const user: User = {
    id: 0,
    name: "john",
  };
  return (
    <>
      {...user}
      <div>ComponentA</div>
    </>
  );
};
