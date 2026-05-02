import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('main.tsx is running');
const rootElement = document.getElementById('root');
console.log('root element:', rootElement);

try {
  createRoot(rootElement!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('Render called successfully');
} catch (error) {
  console.error('Error during render:', error);
}
