import type { User } from '../types/User';

export const ComponentA = () => {
  const user: User = {
    id: 0,
    name: 'john',
  };
  return (
    <>
      <div>id: {user.id}</div>
      <div>name: {user.name}</div>
      <div>ComponentA</div>
    </>
  );
};
