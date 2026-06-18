import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import gudangRoutes from './routes/gudang.routes';
import pengajuanRoutes from './routes/pengajuan.routes';
import sseRoutes from './routes/sse.routes';
import produkRoutes from './routes/produk.routes';
import varianRoutes from './routes/varian.routes';
import kemasanRoutes from './routes/kemasan.routes';
import penerimaanRoutes from './routes/penerimaan.routes';
import penjualanKeluarRoutes from './routes/penjualan-keluar.routes';
import webhookRoutes from './routes/webhook.routes';
import permintaanPengadaanRoutes from './routes/permintaan-pengadaan.routes';
import pemrosesanRoutes from './routes/pemrosesan.routes';
import hppRoutes from './routes/hpp.routes';
import laporanBatchRoutes from './routes/laporan-batch.routes';
import hargaPetaniRoutes from './routes/harga-petani.routes';
import jadwalProduksiRoutes from './routes/jadwal-produksi.routes';
import trendTokoRoutes from './routes/trend-toko.routes';
import masterKomoditasRoutes from './routes/master-komoditas.routes';

const app = express();

// Configure CORS to allow access from local/production web applications
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'x-api-key'],
  })
);

// Standard parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API routes
app.use('/api/auth', authRoutes);
app.use('/api/gudang', gudangRoutes);
app.use('/api/pengajuan', pengajuanRoutes);
app.use('/api/events', sseRoutes);
app.use('/api/produk', produkRoutes);
app.use('/api/varian', varianRoutes);
app.use('/api/kemasan', kemasanRoutes);
app.use('/api/penerimaan', penerimaanRoutes);
app.use('/api/penjualan-keluar', penjualanKeluarRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/permintaan-pengadaan', permintaanPengadaanRoutes);
app.use('/api/pemrosesan', pemrosesanRoutes);
app.use('/api/hpp', hppRoutes);
app.use('/api/laporan', laporanBatchRoutes);
app.use('/api/harga-petani', hargaPetaniRoutes);
app.use('/api/jadwal-produksi', jadwalProduksiRoutes);
app.use('/api/gudang', trendTokoRoutes);
app.use('/api/master-komoditas', masterKomoditasRoutes);
// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Handling 404 - Not Found routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    statusCode: 404,
    message: `Resource '${req.originalUrl}' not found`,
  });
});

// Error handling middleware
interface AppError {
  status?: number;
  message?: string;
  stack?: string;
}
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status ?? 500).json({
    statusCode: err.status ?? 500,
    message: err.message ?? 'Terjadi kesalahan internal server',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;
