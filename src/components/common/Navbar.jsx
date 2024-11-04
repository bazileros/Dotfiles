import React from 'react';

const Navbar = () => (
  <nav className="main-nav">
    <a href="index.html" className="logo">
      <img src="assets/images/logo.png" alt="logo" style={{ width: 100, borderRadius: "50%" }} />
    </a>
    <ul className="nav">
      {['Home', 'Services', 'About Us', 'Message Us'].map((item, index) => (
        <li key={index} className="scroll-to-section">
          <a href={`#${item.toLowerCase().replace(' ', '')}`}>{item}</a>
        </li>
      ))}
      <li className="scroll-to-section">
        <div className="main-red-button">
          <a href="#contact">Contact Now</a>
        </div>
      </li>
    </ul>
    <a className="menu-trigger"><span>Menu</span></a>
  </nav>
);

export default Navbar;