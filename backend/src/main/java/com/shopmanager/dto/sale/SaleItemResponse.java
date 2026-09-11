package com.shopmanager.dto.sale;

import java.math.BigDecimal;
import java.math.RoundingMode;

import com.shopmanager.entity.Product;
import com.shopmanager.entity.SaleItem;
import com.shopmanager.entity.Unit;


public record SaleItemResponse(
        Long productId,
        String productName,
        String productSku,
        Unit unit,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal purchasePrice,
        BigDecimal lineTotal,
        BigDecimal mrp) {

    public static SaleItemResponse from(SaleItem item) {
        Product product = item.getProduct();
        return new SaleItemResponse(
                product.getId(),
                product.getName(),
                product.getSku(),
                product.getUnit(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getPurchasePrice(),
                item.getUnitPrice().multiply(item.getQuantity())
                        .setScale(2, RoundingMode.HALF_UP),
                item.getMrp());
    }
}