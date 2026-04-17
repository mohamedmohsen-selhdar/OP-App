import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const ar = {
  // Modules
  production: 'الإنتاج',
  inventory: 'المخزون',
  quality: 'الجودة',
  maintenance: 'الصيانة',
  procurement: 'المشتريات',
  sales: 'المبيعات',
  dashboard: 'لوحة التحكم',
  settings: 'الإعدادات',

  // Actions
  save: 'حفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  edit: 'تعديل',
  view: 'عرض',
  approve: 'موافقة',
  reject: 'رفض',
  submit: 'إرسال',
  confirm: 'تأكيد',
  back: 'رجوع',
  add: 'إضافة',
  search: 'بحث',
  filter: 'تصفية',
  export: 'تصدير',
  print: 'طباعة',
  close: 'إغلاق',
  retry: 'إعادة المحاولة',

  // Status
  draft: 'مسودة',
  approved: 'مُعتمد',
  in_progress: 'جارٍ التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  open: 'مفتوح',
  resolved: 'محلول',
  pending: 'قيد الانتظار',
  rejected: 'مرفوض',
  running: 'يعمل',
  stopped: 'متوقف',
  critical: 'حرج',
  escalated: 'مُصعَّد',

  // Fields
  name: 'الاسم',
  code: 'الكود',
  quantity: 'الكمية',
  date: 'التاريخ',
  notes: 'ملاحظات',
  status: 'الحالة',
  branch: 'الفرع',
  machine: 'الماكينة',
  worker: 'العامل',
  type: 'النوع',
  description: 'الوصف',
  price: 'السعر',
  total: 'الإجمالي',
  unit: 'الوحدة',
  supplier: 'المورد',
  customer: 'العميل',
  phone: 'الهاتف',
  email: 'البريد الإلكتروني',
  address: 'العنوان',

  // Messages
  saved_successfully: 'تم الحفظ بنجاح',
  deleted_successfully: 'تم الحذف بنجاح',
  error_occurred: 'حدث خطأ، يرجى المحاولة مرة أخرى',
  confirm_delete: 'هل أنت متأكد من الحذف؟ لا يمكن التراجع.',
  no_data: 'لا توجد بيانات',
  loading: 'جارٍ التحميل...',
  unauthorized: 'غير مصرح لك بالوصول',
  offline: 'لا يوجد اتصال بالإنترنت — البيانات محفوظة محلياً',
  back_online: 'تم استعادة الاتصال',
  required_field: 'هذا الحقل مطلوب',
  invalid_email: 'البريد الإلكتروني غير صحيح',

  // Auth
  sign_in: 'تسجيل الدخول',
  sign_out: 'تسجيل الخروج',
  email_placeholder: 'البريد الإلكتروني',
  password_placeholder: 'كلمة المرور',
  wrong_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  welcome_back: 'أهلاً بعودتك',

  // App
  app_name: 'FactoryOS',
  app_subtitle: 'نظام إدارة التصنيع',
};

const en = {
  // Modules
  production: 'Production',
  inventory: 'Inventory',
  quality: 'Quality',
  maintenance: 'Maintenance',
  procurement: 'Procurement',
  sales: 'Sales',
  dashboard: 'Dashboard',
  settings: 'Settings',

  // Actions
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  view: 'View',
  approve: 'Approve',
  reject: 'Reject',
  submit: 'Submit',
  confirm: 'Confirm',
  back: 'Back',
  add: 'Add',
  search: 'Search',
  filter: 'Filter',
  export: 'Export',
  print: 'Print',
  close: 'Close',
  retry: 'Retry',

  // Status
  draft: 'Draft',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  open: 'Open',
  resolved: 'Resolved',
  pending: 'Pending',
  rejected: 'Rejected',
  running: 'Running',
  stopped: 'Stopped',
  critical: 'Critical',
  escalated: 'Escalated',

  // Fields
  name: 'Name',
  code: 'Code',
  quantity: 'Quantity',
  date: 'Date',
  notes: 'Notes',
  status: 'Status',
  branch: 'Branch',
  machine: 'Machine',
  worker: 'Worker',
  type: 'Type',
  description: 'Description',
  price: 'Price',
  total: 'Total',
  unit: 'Unit',
  supplier: 'Supplier',
  customer: 'Customer',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',

  // Messages
  saved_successfully: 'Saved successfully',
  deleted_successfully: 'Deleted successfully',
  error_occurred: 'An error occurred. Please try again.',
  confirm_delete: 'Are you sure you want to delete? This cannot be undone.',
  no_data: 'No data available',
  loading: 'Loading...',
  unauthorized: 'Not authorized',
  offline: 'No internet connection — data is saved locally',
  back_online: 'Connection restored',
  required_field: 'This field is required',
  invalid_email: 'Invalid email address',

  // Auth
  sign_in: 'Sign In',
  sign_out: 'Sign Out',
  email_placeholder: 'Email address',
  password_placeholder: 'Password',
  wrong_credentials: 'Wrong email or password',
  welcome_back: 'Welcome back',

  // App
  app_name: 'FactoryOS',
  app_subtitle: 'Manufacturing ERP',
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: localStorage.getItem('factoryos_lang') ?? 'ar',
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
  });

export default i18n;
