import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { Provider } from 'react-redux';
import App from './App.jsx';
import Home from './components/Home.jsx';
import Room from './components/Room.jsx';
import CodeEditor from './components/CodeEditor.jsx';
import Login from './components/Login.jsx';
import Signup from './components/SignUp.jsx';
import store from './store/store.js';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />
      },
      {
        path: "/login",
        element: <Login />
      },
      {
        path: "/signup",
        element: <Signup />
      },
      {
        path: "/start",
        element: <Room />
      },
      {
        path: "/room/:roomId/:userId",
        element: <CodeEditor />
      },
    ]
  }
])
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
