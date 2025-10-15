const Product = require('../models/Product');

class ProductController {
  async createProduct(req, res) {
    try {
      const productData = {
        ...req.body,
        created_by: req.user.id
      };

      const product = await Product.create(productData);
      
      res.status(201).json({
        message: 'Produit créé avec succès',
        product
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la création du produit' });
    }
  }

  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.update(id, req.body);
      
      if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      res.json({
        message: 'Produit mis à jour avec succès',
        product
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
    }
  }

    async toggleProductStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const product = await Product.updateStatus(id, is_active);
      
      if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      res.json({
        message: `Produit ${is_active ? 'activé' : 'désactivé'} avec succès`,
        product
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la modification du statut' });
    }
  }


  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      await Product.delete(id);
      
      res.json({ message: 'Produit supprimé avec succès' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la suppression du produit' });
    }
  }

  async getAllProducts(req, res) {
    try {
      const products = await Product.findAll();
      res.json({ products });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
    }
  }

  async getProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      
      if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      res.json({ product });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
    }
  }
}

module.exports = new ProductController();