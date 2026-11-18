'use strict';
function gexplanation(c,x,input,ok=false){
 const v=c.variants.find(v=>v.source!=='forumflash')||c.variants[0];
 if(!/_{2,}/.test(c.term)){
  const m=(v.example||'').match(/\b(to|for|of|in|by|with|without|from|on)\s+([a-z]+ing)\b/i);
  return `Chỗ trống trong câu mẫu là “${x.answer}”. ${m?`Ở đây “${m[1]}” là giới từ; động từ theo sau được dùng ở dạng V-ing: ${m[1]} ${x.answer}. Không dùng động từ nguyên mẫu ở vị trí này.`:'Đối chiếu dạng từ với cấu trúc và câu mẫu bên dưới.'}`;
 }
 const before=c.term.split(/_{2,}/)[0].trim(),after=c.term.split(/_{2,}/)[1]?.trim()||'';
 const rules=[
 [/\bculminat(?:e|es|ed|ing)$/i,'culminate in + danh từ/cụm danh từ chỉ kết quả: cuối cùng dẫn đến hoặc kết thúc bằng kết quả đó, thường sau một quá trình hay chuỗi sự kiện. Culminated là dạng quá khứ của culminate; giới từ in đi cùng động từ này để giới thiệu kết quả cuối cùng.'],
 [/\bimmersed$/i,'immersed in + môi trường: đắm mình hoặc được đặt trong môi trường đó.'],
 [/\bcater$/i,'cater to + người/nhu cầu: đáp ứng nhu cầu của đối tượng đó.'],
 [/\bequipped$/i,'be equipped with + kỹ năng/công cụ: được trang bị thứ gì.'],
 [/\bdistinguish\b/i,'distinguish A from B: phân biệt A với B.'],
 [/\bdepriv(?:e|ed)\b/i,'deprive somebody of something / be deprived of something: tước đi hoặc bị thiếu một thứ.'],
 [/\bconducive$/i,'conducive to + danh từ/V-ing: tạo điều kiện thuận lợi cho một việc. “To” ở đây là giới từ.'],
 [/\breceptive$/i,'receptive to + ý kiến/đề xuất: sẵn sàng tiếp nhận điều đó.'],
 [/\bexempt$/i,'exempt from + nghĩa vụ/quy định: được miễn điều đó.'],
 [/\bhinge[sd]?$/i,'hinge on + yếu tố: phụ thuộc quyết định vào yếu tố đó.'],
 [/\bcapable$/i,'capable of + danh từ/V-ing: có khả năng làm việc gì.'],
 [/\bspecializ[es]*$/i,'specialize in + lĩnh vực/V-ing: chuyên về một lĩnh vực hoặc hoạt động.'],
 [/\bencroach(?:ing)?$/i,'encroach on + quyền/lĩnh vực: xâm phạm điều đó.'],
 [/\binteract$/i,'interact with + người/hệ thống: tương tác với đối tượng đó.'],
 [/\bdeter\b/i,'deter somebody from + V-ing: ngăn hoặc làm ai nản lòng không thực hiện việc đó.'],
 [/\breliant$/i,'reliant on + người/thứ gì: phụ thuộc vào đối tượng đó.'],
 [/\b(?:vulnerable|susceptible|prone)$/i,'vulnerable/susceptible/prone to + tác động hoặc nguy cơ: dễ chịu tác động hoặc dễ mắc phải điều đó.'],
 [/\bstem[sd]?$/i,'stem from + nguyên nhân: bắt nguồn từ nguyên nhân đó.'],
 [/\bsynonymous$/i,'synonymous with + từ/khái niệm: đồng nghĩa hoặc gắn liền với điều đó.'],
 [/\b(?:incompatible|compatible|commensurate)$/i,'compatible/incompatible/commensurate with + đối tượng so sánh: tương thích/không tương thích/tương xứng với đối tượng đó.'],
 [/\bdevoid$/i,'devoid of + danh từ: hoàn toàn không có thứ gì.'],
 [/\bclamp down$/i,'clamp down on + hành vi: mạnh tay ngăn chặn hành vi đó.'],
 [/\bgrapple$/i,'grapple with + vấn đề: vật lộn để giải quyết vấn đề đó.'],
 [/\badept$/i,'adept at + danh từ/V-ing: giỏi hoặc thành thạo một việc.'],
 [/\bopt$/i,'opt for + lựa chọn: chọn phương án đó.'],
 [/\bcope$/i,'cope with + khó khăn: đối phó hoặc xử lý khó khăn đó.'],
 [/\bresult$/i,'result in + kết quả: dẫn đến kết quả đó. Phân biệt result from + nguyên nhân.'],
 [/\brecover$/i,'recover from + bệnh/tổn thất: hồi phục sau điều đó.'],
 [/\b(?:attributable|detrimental)$/i,'attributable to = có thể quy cho nguyên nhân; detrimental to = gây hại cho đối tượng theo sau.'],
 [/\bpaved? the way$/i,'pave the way for + danh từ/V-ing: mở đường, tạo điều kiện cho việc gì.'],
 [/\bcatalyst$/i,'a catalyst for + sự thay đổi: tác nhân thúc đẩy sự thay đổi đó.'],
 [/\b(?:accused|guilty|innocent)\b/i,'accuse somebody of / guilty of / innocent of + hành vi: cáo buộc / có tội / vô tội đối với hành vi đó.'],
 [/\babide$/i,'abide by + quy định: tuân thủ quy định đó.'],
 [/\b(?:refrain|abstain)$/i,'refrain/abstain from + danh từ/V-ing: kiềm chế hoặc không thực hiện việc đó.'],
 [/\bsuccumb$/i,'succumb to + áp lực/bệnh/cám dỗ: không chống đỡ được và bị khuất phục bởi điều đó.'],
 [/\bpride$/i,'take pride in + danh từ/V-ing: tự hào về điều gì.'],
 [/\bimmune$/i,'immune to + tác động/bệnh: miễn nhiễm hoặc không bị tác động bởi điều đó.'],
 [/\bat odds$/i,'at odds with + người/ý kiến: mâu thuẫn hoặc không phù hợp với đối tượng đó.'],
 [/\byearn$/i,'yearn for + điều mong muốn: khao khát điều đó.'],
 [/\b(?:committed|accustomed)$/i,'be committed/accustomed to + danh từ/V-ing: cam kết với / quen với việc gì. “To” là giới từ.'],
 [/\blook forward$/i,'look forward to + danh từ/V-ing: mong chờ việc gì. “To” là giới từ, không phải dấu hiệu của động từ nguyên mẫu.'],
 [/\bgot around$/i,'get around to + V-ing: cuối cùng cũng thu xếp làm được việc đã trì hoãn.']
 ];
 const rule=rules.find(([pattern])=>pattern.test(before));
 const fragment=before.split(/\s+/).slice(-5).join(' ')+' '+x.answer+' '+after.split(/\s+/).slice(0,5).join(' ');
 return `${rule?rule[1]:`Trong câu này, chỗ trống nối phần trước với “${after}”; giới từ/cụm từ trong đáp án mẫu là “${x.answer}”. Hãy ghi nhớ nó cùng cả cụm trong câu, vì không thể chọn giới từ chỉ bằng cách dịch từng từ sang tiếng Việt.`} Cụm cần đối chiếu: “${fragment}”. ${ok?`Bạn điền “${x.answer}”, đúng với cấu trúc của bài này.`:`Bạn điền “${input.trim()}”, khác với “${x.answer}” trong cấu trúc của bài này.`}`;
}
window.KGrammar={explain:gexplanation};
