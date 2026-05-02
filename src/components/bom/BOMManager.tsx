import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Plus, Edit, Trash2, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export default function BOMManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsData, materialsData] = await Promise.all([
        supabase.from('finished_products').select('*').order('name'),
        supabase.from('raw_materials').select('*').order('name')
      ]);

      if (productsData.error) throw productsData.error;
      if (materialsData.error) throw materialsData.error;

      setProducts(productsData.data || []);
      setMaterials(materialsData.data || []);
    } catch (error) {
      console.error('Failed to load BOM data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bill of Materials</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create BOM
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Finished Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.unit}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Layers className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Raw Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {materials.map((material) => (
                <div key={material.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{material.name}</p>
                    <p className="text-sm text-gray-600">{material.unit}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BOM Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No BOM configurations found</h3>
            <p className="text-gray-600 mb-4">Create your first bill of materials to get started</p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create BOM
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
