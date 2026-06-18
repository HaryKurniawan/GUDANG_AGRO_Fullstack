import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Spin,
  Popconfirm,
  Tag,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  listAfiliasiAdmin,
  createAfiliasiManual,
  updateAfiliasi,
  deleteAfiliasi,
  getKepalaPetaniTersedia,
} from '../../lib/api';

const AfiliasiManagePage: React.FC = () => {
  const [afiliasiList, setAfiliasiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [kepalaPetaniOptions, setKepalaPetaniOptions] = useState<any[]>([]);
  const [gudangFilter, setGudangFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Load afiliasi list
  useEffect(() => {
    loadAfiliasiList();
  }, [gudangFilter, statusFilter, roleFilter, searchText]);

  const loadAfiliasiList = async () => {
    try {
      setLoading(true);
      const response = await listAfiliasiAdmin({
        gudangId: gudangFilter || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        search: searchText || undefined,
      });
      setAfiliasiList(response.data || []);
    } catch (error: any) {
      message.error('Gagal memuat daftar afiliasi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Load available kepala petani from PETANI service
  const loadKepalaPetaniOptions = async (search?: string) => {
    try {
      const response = await getKepalaPetaniTersedia(search);
      if (response.data && Array.isArray(response.data)) {
        setKepalaPetaniOptions(
          response.data.map((kp: any) => ({
            label: `${kp.petaniNama || kp.nama} (${kp.petaniId || kp.id})`,
            value: kp.petaniId || kp.id,
          }))
        );
      }
    } catch (error) {
      console.error('Gagal memuat daftar kepala petani:', error);
    }
  };

  // Open modal for create/edit
  const openModal = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({
        petaniId: record.petaniId,
        kepalaPetaniId: record.kepalaPetaniId,
        gudangId: record.gudangId,
        petaniNama: record.petaniNama,
        petaniNik: record.petaniNik,
        noHp: record.noHp,
        role: record.role,
        status: record.status,
      });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    loadKepalaPetaniOptions();
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  // Handle form submit
  const handleSubmit = async (values: any) => {
    try {
      if (editingId) {
        // Update existing
        await updateAfiliasi(editingId, {
          status: values.status,
          noHp: values.noHp,
          kepalaPetaniId: values.kepalaPetaniId,
        });
        message.success('Afiliasi berhasil diperbarui');
      } else {
        // Create new
        await createAfiliasiManual({
          petaniId: values.petaniId,
          kepalaPetaniId: values.kepalaPetaniId || undefined,
          gudangId: values.gudangId,
          petaniNama: values.petaniNama,
          petaniNik: values.petaniNik,
          noHp: values.noHp,
          role: values.role,
          status: values.status,
        });
        message.success('Afiliasi berhasil dibuat');
      }
      closeModal();
      loadAfiliasiList();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteAfiliasi(id);
      message.success('Afiliasi berhasil dihapus');
      loadAfiliasiList();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Gagal menghapus afiliasi');
    }
  };

  const columns: any[] = [
    {
      title: 'Nama Petani',
      dataIndex: 'petaniNama',
      key: 'petaniNama',
      width: 180,
    },
    {
      title: 'Petani ID',
      dataIndex: 'petaniId',
      key: 'petaniId',
      width: 140,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: 'Gudang',
      dataIndex: ['gudang', 'nama'],
      key: 'gudangNama',
      width: 150,
      render: (_: any, record: any) => (
        <div>
          <div>{record.gudang?.nama}</div>
          <small style={{ color: '#999' }}>{record.gudangId}</small>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => (
        <Tag color={role === 'kepala_petani' ? 'blue' : 'green'}>{role}</Tag>
      ),
    },
    {
      title: 'No. HP',
      dataIndex: 'noHp',
      key: 'noHp',
      width: 130,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'aktif' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Hapus Afiliasi?"
            description="Apakah Anda yakin ingin menghapus afiliasi ini?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya"
            cancelText="Tidak"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              Hapus
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2>Manajemen Afiliasi Petani-Gudang</h2>

      <div
        style={{
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        <Input
          placeholder="Cari nama petani..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select
          placeholder="Filter Gudang"
          allowClear
          value={gudangFilter}
          onChange={setGudangFilter}
          options={[
            { label: 'GDG-BANDUNG-001', value: 'GDG-BANDUNG-001' },
            { label: 'GDG-BOGOR-001', value: 'GDG-BOGOR-001' },
          ]}
        />
        <Select
          placeholder="Filter Role"
          allowClear
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { label: 'Kepala Petani', value: 'kepala_petani' },
            { label: 'Petani', value: 'petani' },
          ]}
        />
        <Select
          placeholder="Filter Status"
          allowClear
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'Aktif', value: 'aktif' },
            { label: 'Nonaktif', value: 'nonaktif' },
          ]}
        />
      </div>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => openModal()}
        style={{ marginBottom: '16px' }}
      >
        Tambah Afiliasi
      </Button>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={afiliasiList}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Spin>

      {/* Modal for Create/Edit */}
      <Modal
        title={editingId ? 'Edit Afiliasi' : 'Tambah Afiliasi Baru'}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {!editingId && (
            <>
              <Form.Item
                label="Pilih Kepala Petani dari PETANI Service"
                name="petaniId"
                rules={[{ required: true, message: 'Pilih kepala petani' }]}
              >
                <Select
                  placeholder="Ketik nama atau pilih dari daftar..."
                  options={kepalaPetaniOptions}
                  showSearch
                  onSearch={(value) => {
                    if (value) {
                      loadKepalaPetaniOptions(value);
                    }
                  }}
                />
              </Form.Item>

              <Form.Item
                label="Gudang Tujuan"
                name="gudangId"
                rules={[{ required: true, message: 'Pilih gudang' }]}
              >
                <Select
                  placeholder="Pilih gudang..."
                  options={[
                    { label: 'GDG-BANDUNG-001 (Gudang Pusat Bandung)', value: 'GDG-BANDUNG-001' },
                    { label: 'GDG-BOGOR-001 (Gudang Regional Bogor)', value: 'GDG-BOGOR-001' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="Nama Petani"
                name="petaniNama"
                rules={[{ required: true, message: 'Masukkan nama petani' }]}
              >
                <Input placeholder="Nama petani (opsional, akan diisi otomatis)" disabled />
              </Form.Item>

              <Form.Item label="NIK Petani" name="petaniNik">
                <Input placeholder="NIK petani" disabled />
              </Form.Item>

              <Form.Item label="Role" name="role" initialValue="kepala_petani">
                <Select
                  options={[
                    { label: 'Kepala Petani', value: 'kepala_petani' },
                    { label: 'Petani', value: 'petani' },
                  ]}
                />
              </Form.Item>

              <Form.Item label="Kepala Petani ID (jika petani reguler)" name="kepalaPetaniId">
                <Input placeholder="ID kepala petani (opsional)" />
              </Form.Item>
            </>
          )}

          <Form.Item label="No. HP" name="noHp">
            <Input placeholder="0812345678" />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            initialValue="aktif"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'Aktif', value: 'aktif' },
                { label: 'Nonaktif', value: 'nonaktif' },
              ]}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingId ? 'Perbarui' : 'Buat'}
              </Button>
              <Button onClick={closeModal}>Batal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AfiliasiManagePage;
