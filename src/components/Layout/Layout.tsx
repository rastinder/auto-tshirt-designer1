import React, { FC, ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout: FC<LayoutProps> = ({ children, title }) => {
  return (
    <div>
      <head>
        <title>{title}</title>
      </head>
      <header>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/designs">Designs</a></li>
            <li><a href="/custom-design">Custom Design</a></li>
          </ul>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>&copy; 2023 Auto T-Shirt Designer. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;
