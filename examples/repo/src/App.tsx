import React from 'react';
// comment
import { createRoot } from 'react-dom/client';
import { ComponentA } from './ComponentA';
import { ComponentB } from './ComponentB';
import { _ComponentC } from './ComponentC';
import { ComponentC } from './ComponentC';
import { ComponentD } from './ComponentD';
const ComponentE = React.lazy(() => import('./ComponentE'));
import style from './style.css';
import './sideEffect';

const str = '😎';

// a comment
createRoot(document.getElementById('root') as HTMLElement)
  .render(
    <React.StrictMode>
      <ComponentA />
      <ComponentB />
      <ComponentC />
      <ComponentD />
      <ComponentE />
      <p>{str}</p>
    </React.StrictMode>,
  );
