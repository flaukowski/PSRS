import React from 'react';
import { Map, FileText, Home, Wallet, Shield, BarChart } from 'lucide-react';

function Navigation({ requestLocation }) {
  const links = [
    {
      href: "/map",
      icon: <Map className="h-4 w-4" />,
      onClick: requestLocation
    },
    {
      href: "/whitepaper",
      icon: <FileText className="h-4 w-4" />
    },
    {
      href: "/home",
      icon: <Home className="h-4 w-4" />
    },
    {
      href: "/treasury",
      icon: <Wallet className="h-4 w-4" />
    },
    {
      href: "/admin",
      icon: <Shield className="h-4 w-4" />
    },
    {
      href: "/lumira",
      icon: <BarChart className="h-4 w-4" />
    }
  ];

  return (
    <nav>
      <ul className="flex items-center space-x-1">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              onClick={link.onClick}
              className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
              title={link.href.slice(1)} // Show path as tooltip
            >
              {link.icon}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navigation;