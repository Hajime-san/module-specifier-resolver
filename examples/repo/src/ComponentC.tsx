import { cool } from '@alias/cool';
import { awesomeModule } from './awesome-module';

export const ComponentC = () => {
  cool();
  return <div>ComponentC</div>;
};

export const _ComponentC = () => {
  awesomeModule();
  return <div>ComponentC</div>;
};
