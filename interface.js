'use strict';
(() => {
  const tabs=[...document.querySelectorAll('[data-support-tab]')];
  function activate(tab,focus=false){
    tabs.forEach(button=>{
      const active=button===tab;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
      document.getElementById(button.getAttribute('aria-controls')).hidden=!active;
    });
    if(focus)tab.focus();
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>activate(tab));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(i+1)%tabs.length;
      if(event.key==='ArrowLeft')next=(i-1+tabs.length)%tabs.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=tabs.length-1;
      if(next!==undefined){event.preventDefault();activate(tabs[next],true);}
    });
  });
})();
