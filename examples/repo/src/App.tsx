import React from 'react';
import { createRoot } from 'react-dom/client';
import { ComponentA } from './ComponentA';
import { ComponentB } from './ComponentB';
import { _ComponentC } from './ComponentC';
import { ComponentC } from './ComponentC';

// a comment
createRoot(document.getElementById('root') as HTMLElement)
  .render(
    <React.StrictMode>
      <ComponentA />
      <ComponentB />
      <ComponentC />
    </React.StrictMode>,
  );
