export const defaultChecklistTemplate = [
  {
    id: "part-1-red-flags",
    title: "🛑 PHẦN 1: BỘ LỌC TỬ THẦN (RED FLAGS — NÉ NGAY)",
    description: "Mục tiêu: Loại bỏ ngay các doanh nghiệp vi phạm nguyên tắc sinh tồn để tránh mất vốn.",
    items: [
      { id: "q1", text: "Ban lãnh đạo: Có dấu hiệu bịp bợm/lừa đảo, hoặc chủ sở hữu không cùng chí hướng với cổ đông?" },
      { id: "q2", text: "Sức khỏe tài chính: Nợ vay nhiều/đòn bẩy cao/đang trên bờ vực phá sản? Thủ thuật tài chính kỳ lạ?" },
      { id: "q3", text: "Đốt tiền / “nghiện” M&A: Lạm dụng M&A?" },
      { id: "q4", text: "Tính ổn định ngành: Ngành biến động/thay đổi liên tục?" },
      { id: "q5", text: "Turnaround: Có phải case “turnaround” (tái cấu trúc từ bờ vực thẳm)?" },
      { id: "q6", text: "Đặc thù ngành: Thuộc ngành Bán lẻ (Retail)?" }
    ]
  },
  {
    id: "part-2-core-strength",
    title: "💎 PHẦN 2: SỨC MẠNH CỐT LÕI (DOANH NGHIỆP VỮNG MẠNH)",
    description: "Mục tiêu: Tìm doanh nghiệp có khả năng sinh tồn và tiến hóa dài hạn.",
    items: [
      { id: "q7", text: "ROCE – Cash: ROCE (trừ tiền mặt) cao và bền vững (vd. >20% trong 5–10 năm)?" },
      { id: "q8", text: "Dự trữ rủi ro: Ít/không nợ và tiền mặt dư thừa?" },
      { id: "q9", text: "Moat: Có rào cản cạnh tranh cao để ngăn đối thủ xâm nhập?" },
      { id: "q10", text: "Chiếm thị phần trong khủng hoảng: Có track record tăng thị phần trong giai đoạn khó khăn?" },
      { id: "q11", text: "Khách hàng phân mảnh: Không phụ thuộc vài khách hàng lớn?" },
      { id: "q12", text: "Nhà cung cấp phân mảnh: Không phụ thuộc vài nhà cung cấp?" },
      { id: "q13", text: "Đội ngũ quản trị ổn định: Ít thay máu nhân sự cấp cao?" },
      { id: "q14", text: "Phân bổ vốn tốt: Ban quản trị có lịch sử capital allocation tốt?" },
      { id: "q15", text: "Ngành thay đổi chậm: Ngành có nhịp thay đổi chậm để moat bền hơn?" }
    ]
  },
  {
    id: "part-3-psychology",
    title: "🧠 PHẦN 3: KIỂM ĐỊNH TÂM LÝ & QUYẾT ĐỊNH XUỐNG TIỀN",
    description: "Mục tiêu: Tránh bẫy tự tin thái quá và FOMO.",
    items: [
      { id: "q16", text: "Quyết định mua có đang bị chi phối bởi FOMO?" },
      { id: "q17", text: "Đã đối chiếu Outside view thay vì chỉ dùng Inside view?" },
      { id: "q18", text: "Giá hiện tại có là mức giá hợp lý (fair price)?" }
    ]
  },
  {
    id: "part-4-guardrails",
    title: "🛡️ PHẦN 4: GUARDRAILS BÁN",
    description: "Chỉ bấm nút BÁN khi chạm 1 trong 3 điều kiện:",
    items: [
      { id: "q19", text: "Tiêu chuẩn quản trị đi xuống (Decline in governance standards)" },
      { id: "q20", text: "Phân bổ vốn sai lầm nghiêm trọng (Egregiously wrong capital allocation)" },
      { id: "q21", text: "Tổn hại cốt lõi không thể phục hồi (Irreparable damage to the business)" }
    ]
  }
];
