import React from 'react';
import MetaTags from './components/MetaTags';
import Preloader from './components/Preloader';
import Header from './components/Header';
import MainBanner from './components/MainBanner';
import Services from './components/Services';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import Footer from './components/common/Footer';

function App() {
  return (
    <>
      <MetaTags />
      <Preloader />
      <Header />
      <MainBanner />
      <Services />
      <AboutUs />
      <ContactUs />
      <Footer />
    </>
  );
}

export default App;