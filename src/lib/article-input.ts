export type ArticleInput = { title: string; category: string; content: string; is_published: boolean };

export function validateArticle(body: Record<string, unknown>): { value?: ArticleInput; errors?: Record<string, string> } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const errors: Record<string, string> = {};
  if (title.length < 3) errors.title = "กรุณากรอกหัวข้ออย่างน้อย 3 ตัวอักษร";
  if (title.length > 200) errors.title = "หัวข้อยาวเกิน 200 ตัวอักษร";
  if (!category) errors.category = "กรุณาเลือกหรือกรอกหมวดหมู่";
  if (category.length > 60) errors.category = "หมวดหมู่ยาวเกิน 60 ตัวอักษร";
  if (content.length < 20) errors.content = "เนื้อหาควรมีอย่างน้อย 20 ตัวอักษร";
  if (content.length > 20000) errors.content = "เนื้อหายาวเกิน 20,000 ตัวอักษร";
  if (Object.keys(errors).length) return { errors };
  return { value: { title, category, content, is_published: body.is_published !== false } };
}
