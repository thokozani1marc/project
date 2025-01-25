import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Button, Table, Modal, Form, Input, InputNumber, message, Tag, Space, Tooltip } from 'antd';
import { PlusOutlined, WarningOutlined } from '@ant-design/icons';

type Key = Database['public']['Tables']['keys']['Row'];
type StockOperation = Database['public']['Tables']['stock_operations']['Row'];

export default function KeyInventory() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchKeys();
    const subscription = supabase
      .channel('key_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'keys' 
      }, fetchKeys)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchKeys() {
    try {
      const { data, error } = await supabase
        .from('keys')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      message.error('Error fetching keys');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function addKey(values: any) {
    try {
      const { error } = await supabase
        .from('keys')
        .insert([{
          ...values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
      message.success('Key added successfully');
      setAddModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Error adding key');
      console.error(error);
    }
  }

  async function adjustStock(keyId: string, quantity: number, type: StockOperation['type'], notes?: string) {
    try {
      const { error } = await supabase.from('stock_operations').insert([{
        key_id: keyId,
        type,
        quantity,
        date: new Date().toISOString(),
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        notes
      }]);

      if (error) throw error;
      
      // Update current stock
      const { error: updateError } = await supabase
        .from('keys')
        .update({ 
          current_stock: keys.find(k => k.id === keyId)!.current_stock + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId);

      if (updateError) throw updateError;
      message.success('Stock updated successfully');
    } catch (error) {
      message.error('Error adjusting stock');
      console.error(error);
    }
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Current Stock',
      dataIndex: 'current_stock',
      key: 'current_stock',
      render: (stock: number, record: Key) => (
        <Space>
          {stock}
          {stock <= record.reorder_point && (
            <Tooltip title="Low stock">
              <WarningOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Key) => {
        if (record.current_stock === 0) return <Tag color="red">Out of Stock</Tag>;
        if (record.current_stock <= record.reorder_point) return <Tag color="orange">Low Stock</Tag>;
        return <Tag color="green">In Stock</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Key) => (
        <Space>
          <Button 
            onClick={() => adjustStock(record.id, 1, 'INTAKE')}
            disabled={record.current_stock === 0}
          >
            Add Stock
          </Button>
          <Button 
            onClick={() => adjustStock(record.id, -1, 'ADJUSTMENT')}
            danger
          >
            Remove Stock
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
        >
          Add New Key
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={keys}
        loading={loading}
        rowKey="id"
      />

      <Modal
        title="Add New Key"
        open={addModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setAddModalVisible(false)}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={addKey}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="brand"
            label="Brand"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="material"
            label="Material"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="current_stock"
            label="Initial Stock"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            name="reorder_point"
            label="Reorder Point"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item
            name="cost_price"
            label="Cost Price"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} precision={2} />
          </Form.Item>
          <Form.Item
            name="selling_price"
            label="Selling Price"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} precision={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
