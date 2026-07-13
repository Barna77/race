import AdminPanel from './components/AdminPanel.jsx';
import PublicDisplay from './components/PublicDisplay.jsx';

export default function App() {
  const route = window.location.pathname.toLowerCase();

  if (route.startsWith('/wall/a')) {
    return <PublicDisplay wall="A" />;
  }

  if (route.startsWith('/wall/b')) {
    return <PublicDisplay wall="B" />;
  }

  if (route.startsWith('/public')) {
    return <PublicDisplay wall="combined" />;
  }

  return <AdminPanel />;
}
