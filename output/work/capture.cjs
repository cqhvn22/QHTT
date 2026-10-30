const {chromium}=require('C:/Users/chuqu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const p=await b.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1.5});
 await p.goto('file:///'+path.resolve('index.html').replaceAll('\\','/'));
 await p.screenshot({path:'output/work/01-giao-dien.png'});
 await p.locator('#problem-title').fill('Ví dụ hướng dẫn');
 await p.locator('#m').fill('3'); await p.locator('#resize-btn').click();
 for(const [sel,v] of Object.entries({'[data-c="0"]':'3','[data-c="1"]':'2','[data-a="0,0"]':'1','[data-a="0,1"]':'1','[data-b="0"]':'4','[data-a="1,0"]':'1','[data-a="1,1"]':'0','[data-b="1"]':'2','[data-a="2,0"]':'0','[data-a="2,1"]':'1','[data-b="2"]':'3'})) await p.locator(sel).fill(v);
 await p.locator('#solve-btn').click(); await p.locator('#result-summary').waitFor({state:'visible'});
 await p.screenshot({path:'output/work/02-don-hinh.png'});
 console.log(await p.locator('#result-summary').innerText());
 await p.locator('#solve-method').selectOption('geometry'); await p.locator('#solve-btn').click();
 await p.waitForTimeout(1500); await p.screenshot({path:'output/work/03-hinh-hoc.png'});
 console.log(await p.locator('#result-summary').innerText());
 await p.locator('[data-geo-canvas]').first().scrollIntoViewIfNeeded();
 await p.screenshot({path:'output/work/04-do-thi.png'});
 await b.close();
})();

