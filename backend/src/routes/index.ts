import { Router } from 'express';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';
import categoryRoutes from './category.routes';
import brandRoutes from './brand.routes';
import unitRoutes from './unit.routes';
import productRoutes from './product.routes';
import inventoryRoutes from './inventory.routes';
import customerRoutes from './customer.routes';
import supplierRoutes from './supplier.routes';
import purchaseRoutes from './purchase.routes';
import purchaseReturnRoutes from './purchaseReturn.routes';
import saleRoutes from './sale.routes';
import saleReturnRoutes from './saleReturn.routes';
import expenseRoutes from './expense.routes';
import cashRoutes from './cash.routes';
import dashboardRoutes from './dashboard.routes';
import reportRoutes from './report.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'OK', data: { status: 'healthy' } });
});

router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/units', unitRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/purchase-returns', purchaseReturnRoutes);
router.use('/sales', saleRoutes);
router.use('/sale-returns', saleReturnRoutes);
router.use('/expenses', expenseRoutes);
router.use('/cash', cashRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

export default router;
