import React from 'react';
import nanalanImg from './images/nanalan.png';

function BobaBolt() {
  return (
    <div>
      <h3>CONGRADULATIONS ON UCD BOBABOLT!!!</h3>
      <img src={nanalanImg} alt="Nanalan" className="nanalan-img" />
      <div className="clear"></div>
      <div className="spinning-heart">❤️</div>
    </div>
  );
}

export default BobaBolt;