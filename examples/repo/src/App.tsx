import React from 'react';
// comment
import { createRoot } from 'react-dom/client';
import { ComponentA } from './ComponentA';
import { ComponentB } from './ComponentB';
import { _ComponentC } from './ComponentC';
import { ComponentC } from './ComponentC';
import { ComponentD } from './ComponentD';
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
      <p>{str}</p>
    </React.StrictMode>,
  );
