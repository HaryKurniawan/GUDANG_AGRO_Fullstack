import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form,
  Input,
  Select,
  Button,
  Card,
  Spin,
  Transfer,
  Space,
} from 'antd';
import { ChevronLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { createKepalGudang, getKepalaPetaniTersedia } from '../../lib/api';

const KepalGudangBaruPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [kepalaPetaniOptions, setKepalaPetaniOptions] = useState<any[]>([]);
  const [selectedAfiliasiIds, setSelectedAfiliasiIds] = useState<string[]>([]);
  const [gudangOptions] = useState<any[]>([
    { label: 'GDG-BANDUNG-001 - Gudang Pusat Bandung', value: 'gudang-id-1' },
    { label: 'GDG-BOGOR-001 - Gudang Regional Bogor', value: 'gudang-id-2' },
  ]);

  useEffect(() => {
    loadKepalaPetaniOptions();
  }, []);

  const loadKepalaPetaniOptions = async () => {
    try {
      const response = await getKepalaPetaniTersedia();
      if (response.data && Array.isArray(response.data)) {
        setKepalaPetaniOptions(
          response.data.map((kp: any) => ({
            key: kp.petaniId || kp.id,
            title: `${kp.petaniNama || kp.nama} (${kp.petaniId || kp.id})`,
            description: kp.noHp || '-',
          }))
        );
      }
    } catch (error) {
      console.error('Gagal memuat daftar kepala petani:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      await createKepalGudang({
        gudangId: values.gudangId,
        nama: values.nama,
        email: values.email,
        password: values.password,
        noTelepon: values.noTelepon,
        kepalaPetaniIdList: selectedAfiliasiIds,
      });

      setSuccess('Kepala gudang berhasil dibuat dengan afiliasi ke ' + selectedAfiliasiIds.length + ' kepala petani');
      setTimeout(() => navigate('/admin/gudang'), 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal membuat kepala gudang';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/admin/gudang')}
          style={{
            padding: '8px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          <ChevronLeft style={{ width: '20px', height: '20px' }} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            Buat Kepala Gudang Baru
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Tambahkan kepala gudang dan hubungkan dengan kepala petani yang terafiliasi
          </p>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <AlertCircle style={{ width: '20px', height: '20px', color: '#dc2626', marginTop: '2px' }} />
          <p style={{ fontSize: '14px', color: '#991b1b', fontWeight: '500', margin: 0 }}>{error}</p>
        </div>
      )}
      {success && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <CheckCircle style={{ width: '20px', height: '20px', color: '#16a34a', marginTop: '2px' }} />
          <p style={{ fontSize: '14px', color: '#166534', fontWeight: '500', margin: 0 }}>{success}</p>
        </div>
      )}

      <Spin spinning={loading}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Form Section */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '16px' }}>
              Informasi Kepala Gudang
            </h3>

            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label="Pilih Gudang"
                name="gudangId"
                rules={[{ required: true, message: 'Pilih gudang' }]}
              >
                <Select
                  placeholder="Pilih gudang..."
                  options={gudangOptions}
                />
              </Form.Item>

              <Form.Item
                label="Nama Lengkap"
                name="nama"
                rules={[{ required: true, message: 'Masukkan nama' }]}
              >
                <Input placeholder="John Doe" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Masukkan email' },
                  { type: 'email', message: 'Format email tidak valid' },
                ]}
              >
                <Input type="email" placeholder="john@agrojabar.co.id" />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Masukkan password' }]}
              >
                <Input.Password placeholder="Minimal 8 karakter" />
              </Form.Item>

              <Form.Item
                label="No. Telepon"
                name="noTelepon"
              >
                <Input placeholder="08123456789" />
              </Form.Item>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Space>
                  <Button onClick={() => navigate('/admin/gudang')}>Batal</Button>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Buat Kepala Gudang
                  </Button>
                </Space>
              </div>
            </Form>
          </Card>

          {/* Afiliasi Selection */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '16px' }}>
              Afiliasi Kepala Petani
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              Pilih kepala petani yang akan berafiliasi dengan gudang ini. Opsional — dapat ditambahkan nanti.
            </p>

            {kepalaPetaniOptions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', padding: '24px 0' }}>
                Memuat daftar kepala petani...
              </p>
            ) : (
              <Transfer
                dataSource={kepalaPetaniOptions}
                titles={['Tersedia', 'Dipilih']}
                targetKeys={selectedAfiliasiIds}
                onChange={(newTargetKeys) => setSelectedAfiliasiIds(newTargetKeys as string[])}
                render={(item) => item.title}
                listStyle={{
                  width: '100%',
                  height: '300px',
                }}
              />
            )}

            <p style={{
              marginTop: '12px',
              fontSize: '12px',
              color: '#64748b',
              background: '#f8fafc',
              padding: '12px',
              borderRadius: '8px',
            }}>
              ℹ️ Total dipilih: <strong>{selectedAfiliasiIds.length}</strong> kepala petani
            </p>
          </Card>
        </div>
      </Spin>
    </div>
  );
};

export default KepalGudangBaruPage;
