import React from 'react';
import { ComponentA } from './ComponentA/index.ts';

export const ComponentD = () => {
  const [value, setValue] = React.useState();
  return (
    <>
      <ComponentA />
      <div>ComponentD</div>
    </>
  );
};
