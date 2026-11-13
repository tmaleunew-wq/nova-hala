import type { jsPDF } from 'jspdf';
import { buildBays } from '../garage/openingSystem';
import type { CladdingReport } from './cladding-report';

type Face = CladdingReport['faces'][number];
/** Dimensions in the same exterior-view coordinates as the cladding surfaces. */
export function drawCladdingWallDetail(pdf: jsPDF, report: CladdingReport, face: Face, x0: number, bottom: number, scale: number, width: number, height: number) {
  const side = face.id === 'left' || face.id === 'right';
  const fields = buildBays(report.params).filter(bay => bay.surface === face.id).map(bay => {
    const center = side ? width / 2 + (face.id === 'left' ? 1 : -1) * bay.position3D[2]
      : width / 2 + (face.id === 'back' ? 1 : -1) * bay.position3D[0];
    return { ...bay, from: center - bay.width / 2, to: center + bay.width / 2 };
  }).sort((a,b) => a.from-b.from);
  const unique = (values: number[]) => [...new Set(values.map(v => Math.round(v*1000)))].sort((a,b)=>a-b).map(v=>v/1000);
  const axes = unique(fields.flatMap(field => [field.from,field.to]));
  const top = bottom-height*scale;
  pdf.setFontSize(5);
  pdf.setTextColor('#222222');
  pdf.setDrawColor('#8c969e');
  pdf.setLineWidth(.1);
  for (const [index, axis] of axes.entries()) {
    const x=x0+axis*scale;
    pdf.setLineDashPattern([1,.7],0);
    pdf.line(x,top-3,x,bottom+2);
    pdf.setLineDashPattern([],0);
    pdf.circle(x,top-5,1.8);
    pdf.text(String(index+1),x,top-4.5,{align:'center'});
  }
  const openings=face.openings.flatMap((opening,index) => {
    const field=fields.find(item=>item.id===opening.bayId);
    if (!field) return [];
    const left=field.from+Math.max(0,opening.x);
    const right=field.from+Math.min(field.width,opening.x+opening.width);
    const low=Math.max(0,opening.y), high=Math.min(field.height,opening.y+opening.height);
    if(right<=left||high<=low) return [];
    const x=x0+left*scale, y=bottom-high*scale, w=(right-left)*scale, h=(high-low)*scale;
    // Keep opening identifiers legible even when a long wall is reduced to A4.
    pdf.setFillColor('#ffffff');pdf.setDrawColor('#222222');
    pdf.rect(x,y,w,h,'FD');
    pdf.setFontSize(5.5);
    pdf.text(`O${index+1}`,x+w/2,y+h/2+.6,{align:'center'});
    if(w>12 && h>5) {
      pdf.setFontSize(4.5);
      pdf.text(`${Math.round((right-left)*1000)} × ${Math.round((high-low)*1000)}`,x+w/2,y+h/2+2.5,{align:'center'});
    }
    return [{left,right,low,high}];
  });
  function horizontal(values: number[], offset: number) {
    const yy=bottom+offset;
    pdf.setFontSize(5);pdf.setLineWidth(.12);pdf.setDrawColor('#55616a');
    for(let i=1;i<values.length;i++) {
      const a=x0+values[i-1]*scale,b=x0+values[i]*scale;
      pdf.line(a,yy,b,yy);
      pdf.line(a-.6,yy+.7,a+.6,yy-.7);pdf.line(b-.6,yy+.7,b+.6,yy-.7);
      const label=String(Math.round((values[i]-values[i-1])*1000));
      const narrow=b-a<pdf.getTextWidth(label)+1;
      pdf.text(label,(a+b)/2,yy-(narrow && i%2 ? 3.2 : 1),{align:'center'});
    }
  }
  horizontal(unique([0,width,...openings.flatMap(o=>[o.left,o.right])]),17);
  horizontal(axes,25);
  const levels=unique([0,height,face.stem?.height ?? 0,...openings.flatMap(o=>[o.low,o.high])]);
  const xx=x0-5;
  pdf.setFontSize(5);
  for(let i=1;i<levels.length;i++) {
    const a=bottom-levels[i-1]*scale,b=bottom-levels[i]*scale;
    pdf.line(xx,a,xx,b);pdf.line(xx-1,a,xx+1,a);pdf.line(xx-1,b,xx+1,b);
    pdf.text(String(Math.round((levels[i]-levels[i-1])*1000)),xx-1.2,(a+b)/2,{angle:90,align:'center'});
  }
  pdf.setFontSize(5.5);
  pdf.text('Kóty v mm · horné značky: osi polí · dolné kóty: otvory a polia',13,bottom+32);
  return bottom+38;
}
